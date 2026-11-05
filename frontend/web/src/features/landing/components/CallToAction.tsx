import { Link } from "react-router-dom"
import { APP_STORE_URL } from "../appStore"

/**
 * The last word: one more way to download, and the privacy promise.
 */
export function CallToAction() {
    return (
        <section className="px-6 pb-14 md:px-16 md:pb-24">
            <div className="mx-auto max-w-[1040px] rounded-[24px] bg-ink px-6 py-14 text-center md:py-20">
                <h2 className="display m-0 mb-4 text-[34px] leading-[1.08] text-bg md:text-[52px]">
                    Who's going to keep you honest?
                </h2>
                <p className="mx-auto mb-7 mt-0 max-w-[460px] text-[17px] leading-[1.5] text-bg opacity-75">
                    Download Beacc, set a goal, and send your friends the code.
                </p>
                <a
                    href={APP_STORE_URL}
                    className="btn btn-lg border-0 bg-lime text-ink"
                >
                    Download on the App Store
                </a>
                <p className="mb-0 mt-6 text-[13px] text-bg opacity-60">
                    We never sell your data or use it for advertising.{" "}
                    <Link to="/privacy" className="text-inherit underline">
                        Read our privacy policy
                    </Link>
                </p>
            </div>
        </section>
    )
}
